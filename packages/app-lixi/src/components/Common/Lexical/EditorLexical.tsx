import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { HashtagPlugin } from '@lexical/react/LexicalHashtagPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary';
import TreeViewPlugin from './plugins/TreeViewPlugin';
import MyCustomAutoFocusPlugin from './plugins/MyCustomAutoFocusPlugin';
import editorConfig from './editorConfig';
import CustomButtonSubmitPlugin from './plugins/CustomButtonSubmitPlugin';
import EmojisPlugin from './plugins/EmojisPlugin';
import TwitterPlugin from './plugins/TwitterPlugin';
import AutoLinkPlugin from './plugins/AutoLinkPlugin';
import AutoEmbedPlugin from './plugins/AutoEmbedPlugin';
import { MultiUploader } from '../Uploader/MultiUploader';
import { PictureOutlined, CloseOutlined } from '@ant-design/icons';
import { LIMIT_CONTENT_POST, UPLOAD_API_S3_MULTIPLE, UPLOAD_TYPES } from '@bcpros/lixi-models/constants';
import styled from 'styled-components';
import LinkPlugin from './plugins/LinkPlugin';
import ButtonLinkPlugin from './plugins/ButtonLinkPlugin';
import FloatingLinkEditorPlugin from './plugins/FloatingLinkEditorPlugin';
import { Image, Button, Progress } from 'antd';
import { useAppDispatch, useAppSelector } from '@store/hooks';
import { getPostCoverUploads } from '@store/account/selectors';
import Gallery from 'react-photo-gallery';
import intl from 'react-intl-universal';
import { removeUpload } from '@store/account';
import YouTubePlugin from './plugins/YouTubePlugin';
import FigmaPlugin from './plugins/FigmaPlugin';
import useDetectMobileView from '@local-hooks/useDetectMobileView';
import MyOnChangePlugin from './plugins/MyOnChangePlugin';
import MaxLengthPlugin from './plugins/MaxLengthPlugin';

export type EditorLexicalProps = {
  initialContent?: string;
  isEditMode?: boolean;
  onSubmit?: (value) => void;
  loading?: boolean;
  hashtags?: string[];
};

const StyledEditorLexical = styled.div`
  display: flex;
  flex-direction: column;
  position: relative;

  // Customine Editor Lexical
  .EditorLexical_container {
    background: #fff;
    position: relative;
  }

  .EditorLexical_root {
    border: 0;
    font-size: 15px;
    display: block;
    position: relative;
    tab-size: 1;
    outline: 0;
    padding: 8px 8px;
    min-height: calc(100% - 16px);
    margin-bottom: 24px;
    iframe {
      max-width: 100%;
    }
  }

  .EditorLexical_hashtag {
    background: #ffd7f6;
  }

  .EditorLexical_placeholder {
    font-size: 15px;
    color: #999;
    overflow: hidden;
    position: absolute;
    text-overflow: ellipsis;
    top: 8px;
    left: 8px;
    right: 8px;
    user-select: none;
    white-space: nowrap;
    display: inline-block;
    pointer-events: none;
  }

  .EditorLexical_action {
    display: flex;
    align-items: center;
    justify-content: start;

    .ant-btn-icon {
      .anticon-twitter {
        font-size: 26px;
      }
    }
  }

  .EditorLexical_submit {
    width: fit-content;
    align-self: flex-end;
    min-width: 140px;
    position: absolute;
    bottom: 0;
  }

  .EditorLexical_pictures {
    max-width: 100%;
    margin-bottom: 2rem;
    .images-post-mobile {
      display: flex;
      overflow-x: auto;
      gap: 5px;
      -ms-overflow-style: none; // Internet Explorer 10+
      scrollbar-width: none; // Firefox
      ::-webkit-scrollbar {
        display: none; // Safari and Chrome
      }
      img {
        width: auto;
        max-width: 75vw !important;
        height: 40vh;
        object-fit: cover;
        border-radius: var(--border-radius-primary);
        border: 1px solid var(--lt-color-gray-100);
      }
      &.only-one-image {
        justify-content: center;
        img {
          width: 100%;
          max-width: 100%;
        }
      }
    }
    .item-image-upload {
      position: relative;
      button {
        position: absolute;
        z-index: 9;
        right: 0;
        background: #303031;
        margin: 4px;
        .anticon {
          color: #fff;
        }
      }
    }
    .react-photo-gallery--gallery > div {
      gap: 5px;
    }
  }

  .progress-content-post {
    position: absolute;
    bottom: 5px;
    right: 150px;
    .ant-progress-inner {
      transition: width 0.2s linear;
    }
    .ant-progress-text {
      color: rgb(244, 33, 46);
    }
  }
`;

const EditorLexical = (props: EditorLexicalProps) => {
  const { initialContent, onSubmit, isEditMode, loading, hashtags } = props;
  const [floatingAnchorElem, setFloatingAnchorElem] = useState<HTMLDivElement | null>(null);
  const dispatch = useAppDispatch();
  const isMobile = useDetectMobileView();
  const postCoverUploads = useAppSelector(getPostCoverUploads);
  const inputText = useRef(null);
  const multiUploader = useRef(null);
  const imagesList = useMemo(() => {
    let imagesListResult = postCoverUploads.map(img => {
      const imgUrl = `${process.env.NEXT_PUBLIC_CF_IMAGES_DELIVERY_URL}/${process.env.NEXT_PUBLIC_CF_ACCOUNT_HASH}/${img.cfImageId}/public`;
      let width = img?.width || 4;
      let height = img?.height || 3;
      let id = img?.id || null;
      let objImg = {
        src: imgUrl,
        width: width,
        height: height,
        id: id
      };
      return objImg;
    });
    return imagesListResult || [];
  }, [postCoverUploads]);
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const [isLinkEditMode, setIsLinkEditMode] = useState<boolean>(false);
  const [pureContent, setPureContent] = useState<string>('');
  const [htmlContent, setHtmlContent] = useState<string>('');

  useEffect(() => {
    inputText.current?.addEventListener('paste', handlePasteImage);
    return () => {
      inputText.current?.removeEventListener('paste', handlePasteImage);
    };
  }, []);

  const Placeholder = () => {
    return <div className="EditorLexical_placeholder">{intl.get('general.createPost')}</div>;
  };

  const setInitialContent = (hashtags: string[], initialContent: string, isEditMode: boolean) => {
    if (isEditMode) {
      return initialContent;
    }

    if (hashtags.length > 0) {
      return hashtags.join(' ');
    }

    return '';
  };

  const handleRemove = imgId => {
    if (imgId) {
      dispatch(removeUpload({ uploadType: UPLOAD_TYPES.POST, id: imgId }));
    }
  };

  const handlePasteImage = evt => {
    const clipboardItems = evt.clipboardData.items;
    const items: DataTransferItem[] | unknown[] = Array.from(clipboardItems).filter(function (item: DataTransferItem) {
      // Filter the image items only
      return /^image\//.test(item.type);
    });
    if (items.length === 0) {
      return;
    }

    const item = items[0] as DataTransferItem;
    const blob = item.getAsFile();
    const blobName = blob.name ?? 'image.png';
    const blobType = blob.type ?? 'image/png';
    const blobLastModified = blob.lastModified ?? Date.now();

    let file = new File([blob], blobName, { type: blobType, lastModified: blobLastModified });

    multiUploader.current?.uploadImageFromClipboard({ file: file });
  };

  const imageRenderer = useCallback(({ photo }) => {
    return (
      <>
        <div className="item-image-upload">
          <Button
            type="text"
            className="no-border-btn"
            icon={<CloseOutlined />}
            onClick={() => handleRemove(photo?.id)}
          />
          <Image src={photo?.src} width={photo?.width} height={photo?.height} />
        </div>
      </>
    );
  }, []);

  const setUploadingImage = state => {
    setIsUploadingImage(state);
  };

  const onRef = (_floatingAnchorElem: HTMLDivElement) => {
    if (_floatingAnchorElem !== null) {
      setFloatingAnchorElem(_floatingAnchorElem);
    }
  };

  const setStatePureContent = content => {
    setPureContent(content);
  };
  const setStateHtmlContent = content => {
    setHtmlContent(content);
  };

  const overLimitContent = () => {
    return htmlContent.length > LIMIT_CONTENT_POST;
  };

  const calculatePercentContent = () => {
    // minus default html content
    const num = ((htmlContent.length - 50) / LIMIT_CONTENT_POST) * 100;
    return num;
  };

  return (
    <React.Fragment>
      <StyledEditorLexical>
        <LexicalComposer initialConfig={editorConfig}>
          <div className="EditorLexical_container">
            <RichTextPlugin
              contentEditable={
                <div className="editor-container" ref={inputText}>
                  <div className="editor" ref={onRef}>
                    <ContentEditable className="EditorLexical_root" />
                  </div>
                </div>
              }
              placeholder={Placeholder}
              ErrorBoundary={LexicalErrorBoundary}
            />
            <MaxLengthPlugin maxLength={overLimitContent() ? pureContent.length : 24000} />
            <MyOnChangePlugin setStateHtmlContent={setStateHtmlContent} setStatePureContent={setStatePureContent} />
            {/* <TreeViewPlugin /> */}
            <TwitterPlugin />
            <YouTubePlugin />
            <FigmaPlugin />
            <EmojisPlugin />
            <HistoryPlugin />
            <AutoLinkPlugin />
            <LinkPlugin />
            <HashtagPlugin />
            <AutoEmbedPlugin />
            <YouTubePlugin />
            <FigmaPlugin />
            <MyCustomAutoFocusPlugin
              initialContent={setInitialContent(hashtags, initialContent, isEditMode)}
              hashtags={hashtags}
            />
            {floatingAnchorElem && (
              <FloatingLinkEditorPlugin
                anchorElem={floatingAnchorElem}
                isLinkEditMode={isLinkEditMode}
                setIsLinkEditMode={setIsLinkEditMode}
              />
            )}
            <div className="EditorLexical_pictures">
              {isMobile ? (
                <React.Fragment>
                  {imagesList?.length > 1 && (
                    <div className="images-post images-post-mobile">
                      {imagesList.map((img, index) => {
                        return (
                          <div className="item-image-upload" key={img.id}>
                            <Image key={index} src={img.src || 'error'} fallback="/images/default-image-fallback.png" />
                            <Button
                              type="text"
                              className="no-border-btn"
                              icon={<CloseOutlined />}
                              onClick={() => handleRemove(img?.id)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {imagesList?.length === 1 && (
                    <>
                      <div className="images-post images-post-mobile only-one-image">
                        {imagesList.map((img, index) => {
                          return (
                            <div className="item-image-upload" key={img.id}>
                              <Image
                                key={index}
                                src={img.src || 'error'}
                                fallback="/images/default-image-fallback.png"
                              />
                              <Button
                                type="text"
                                className="no-border-btn"
                                icon={<CloseOutlined />}
                                onClick={() => handleRemove(img?.id)}
                              />
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </React.Fragment>
              ) : (
                <Gallery renderImage={imageRenderer} photos={imagesList} />
              )}
            </div>
            <div className="EditorLexical_action">
              <MultiUploader
                ref={multiUploader}
                type={UPLOAD_TYPES.POST}
                isIcon={true}
                icon={'/images/ico-picture.svg'}
                buttonName=" "
                buttonType="text"
                showUploadList={false}
                loading={isUploadingImage}
                setUploadingImage={setUploadingImage}
                multiple={true}
              />
              <ButtonLinkPlugin />
            </div>
          </div>
          {overLimitContent() ? (
            <Progress
              type="circle"
              size={35}
              className="progress-content-post"
              percent={100}
              status="exception"
              strokeColor="rgb(244, 33, 46)"
            />
          ) : (
            <Progress
              type="circle"
              size={calculatePercentContent() > 99 ? 35 : 30}
              strokeColor={calculatePercentContent() > 99 ? 'rgb(255, 212, 0)' : '#1677ff'}
              className="progress-content-post"
              percent={calculatePercentContent()}
              showInfo={false}
            />
          )}

          <CustomButtonSubmitPlugin
            onSubmit={value => onSubmit(value)}
            loading={loading || isUploadingImage}
            isEditMode={isEditMode}
            currentContent={pureContent}
            image={postCoverUploads}
            overLimitContent={overLimitContent()}
          />
        </LexicalComposer>
      </StyledEditorLexical>
    </React.Fragment>
  );
};

export default EditorLexical;
